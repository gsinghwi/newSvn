#!/usr/local/bin/perl -w
use strict;
use FileHandle;
use DirHandle;
use Getopt::Long;
use Data::Dumper;
use FindBin;
use File::Copy;
#use FreezeThaw qw( freeze thaw );
use lib qw (../perl ../../perl);
use vars qw ($q $sbeams $sbeamsMOD  %columnHeaderHash @columnIndex %easyHash $ORGANISM $USAGE %OPTIONS $QUIET $VERBOSE $DEBUG $TESTONLY $TISSUETYPE
             $current_contact_id $current_username );

use SBEAMS::Immunostain;
use SBEAMS::Immunostain::Settings;
use SBEAMS::Immunostain::Tables;

use SBEAMS::Ontology;
use SBEAMS::Ontology::Settings;
use SBEAMS::Ontology::Tables;


use SBEAMS::Connection qw($q);
use SBEAMS::Connection::Settings;
use SBEAMS::Connection::Tables;

$sbeams = new SBEAMS::Connection;

$sbeams = new SBEAMS::Connection;
$sbeamsMOD = new SBEAMS::Immunostain;
$sbeamsMOD->setSBEAMS($sbeams);
$sbeams->setSBEAMS_SUBDIR($SBEAMS_SUBDIR);

#use CGI;
#$q = CGI->new();


my $PROG_NAME = $FindBin::Script;

$USAGE = <<EOU;
Usage: $PROG_NAME [OPTIONS]
Options:
  --verbose n          Set verbosity level.  default is 0
  --quiet              Set flag to print nothing at all except errors
  --debug n            Set debug flag
  --testonly           If set, rows in the database are not changed or added
  --tissue_type				 Tissue type to be processed (bladder, prostate)
  --organism        human or mouse 
  --source_file XXX    Source file name from which data are to be updated
  									It needs to be a tab delimited .txt file
 --error_file	  Error file name to which loading errors are printed 
 							This will be a tab delimited .txt file
  --check_status       Is set, nothing is actually done, but rather
                       a summary of what should be done is printed

 e.g.:  $PROG_NAME --check_status --tissue_type prostate --organism human --source_file  /users/bob/Loading.txt
--error_file /users/bob/Error.txt
EOU


#### Process options
unless (GetOptions(\%OPTIONS,"verbose:s","quiet","debug:s","testonly","tissue_type=s",
		   "organism:s" ,"source_file=s","check_status","error_file=s",
		  ))
{
  print "$USAGE";
  exit;
}

$VERBOSE = $OPTIONS{"verbose"} || 0;
$QUIET = $OPTIONS{"quiet"} || 0;
$DEBUG = $OPTIONS{"debug"} || 0;
$TESTONLY = $OPTIONS{"testonly"} || 0;
$TISSUETYPE = $OPTIONS{"tissue_type"};
$ORGANISM = $OPTIONS{"organism"};
if ($DEBUG)
{
  print "Options settings:\n";
  print "  VERBOSE = $VERBOSE\n";
  print "  QUIET = $QUIET\n";
  print "  DEBUG = $DEBUG\n";
  print "  TESTONLY = $TESTONLY\n";
}

	
main();
exit;
#global lookup hash
my (%tissueType,%surgProc,%clinDiag,%cellType,%cellPresenceLevel,%confHash,$fhError, %antiBody, %abundanceLevel,
 %ontologyHash,$lastName, %loadImageHash, %prostateCellHash,%imageNameingHash);

sub main
{
		 #### Do the SBEAMS authentication and exit if a username is not returned
		 exit unless ($current_username = $sbeams->Authenticate(
		 work_group=>'Immunostain_user',
  ));

my @bladderColumnArray = (
		'specimen block',
		'section',
		'antibody',
		'gender',
		'stain intensity',	
	  'Cap Cells',
		'Intermediate Cells',
		'Basal Epithelial Cells',
		'stain intensity',
		'Lamina propria - superficial',
		'Lamina propria - deep',
		'Submucosa',
		'Muscularis propria',
		'Leukocyte abundance (none, rare, moderate, high, most)',
		'stain intensity',
		'Transitional Cell Carcinoma',
		'file image',
		'comment');
    
my @bladderMouseColumnArray = (    
    'specimen block',	
    'section',	
    'antibody',
    'gender	',
    'stain intensity',
    'Superficial Epithelial Cells',
    'Intermediate Cells',
    'Basal Epithelial Cells',	
    'stain intensity',
    'Lamina propria - superficial',	
    'Submucosa',
    'Muscularis propria',
    'Stromal Endothelial Cells',
    'Leukocyte abundance (none, rare, moderate, high, most)',
    'comment'
    );
    
       
my @prostateColumnArray = (
		'specimen block',
		'block antibody section index',
		'patient age',
		'surgical procedure',
		'clinical diagnosis',
		'tissue block level',		
		'tissue block side (R/L)',
		'block location anterior-posterior',
		'antibody',
		'characterization contact last name',
		'stain intensity',	
		'% atrophic glands at each staining intensity',
		'% normal glands at each staining intensity',	
		'% hyperplastic glands at each staining intensity',
		'stain intensity',
		'% basal cells at each staining intensity',
		'% Stromal Fibromuscular cells at each staining intensity',
		'% Endothelial cells at each staining intensity',
		'% Perineural cells at each staining intensity',
		'% Nerve Sheath cells at each staining intensity',
		'Leukocyte abundance (none, rare, moderate, high, most)',
		'Amount of cancer in section (cc)',
		'stain intensity',
		'% of tumor that is Gleason pattern 3',
		'% Gleason pattern 3 cancer at each staining intensity',
		'% of tumor that is Gleason pattern 4',
		'% Gleason pattern 4 cancer at each staining intensity',
		'% of tumor that is Gleason pattern 5',
		'% Gleason pattern 5 cancer at each staining intensity',
		'file image',
		'comment'
		);
    
 my @prostateMouseColumnArray = (   
   'specimen block',
   'block antibody section index',
   'antibody',
   'lobe of prostate (central, lobe, other/unknown)',	
   'stain intensity',
   '% luminal cells at each staining intensity',
   '% basal cells at each staining intensity	',
   '% Stromal Fibromuscular cells at each staining intensity',	
   '% Endothelial cells at each staining intensity',
   'Leukocyte abundance (rare, moderate, high, most, 0)',	
    'comment'
    );
    
%prostateCellHash = (		
'% basal cells at each staining intensity'	=>	'Basal Epithelial Cells',
'% Stromal Fibromuscular cells at each staining intensity'	=>	'Stromal Fibromuscular Cells',
'% Endothelial cells at each staining intensity'	=>	'Stromal Endothelial Cells',
'% Perineural cells at each staining intensity'	=>	'Stromal Perineural Cells',
'% Nerve Sheath cells at each staining intensity'	=>	'Stromal Nerve Sheath Cells',
'% atrophic glands at each staining intensity'	=>	'Atrophic glands',
'% normal glands at each staining intensity'	=>	'Normal glands',
'% hyperplastic glands at each staining intensity'	=>	'Hyperplastic glands',
'% Gleason pattern 3 cancer at each staining intensity' =>	'Gleason Pattern 3',
'% Gleason pattern 4 cancer at each staining intensity' =>	'Gleason Pattern 4',
'% Gleason pattern 5 cancer at each staining intensity'	 =>	'Gleason Pattern 5'
);

%imageNameingHash= (
raw => 'raw',
pro => 'processed',
ann	=>	'annontated'
);
		
    print "$TISSUETYPE\n";
    print "$ORGANISM\n";
		
		my (%permenantHash,%dataHash);
		my $count = 0;
		my @columnHeaderArray;
		@columnHeaderArray = @bladderColumnArray if ($TISSUETYPE =~/bladder/i and $ORGANISM =~/human/i);
		@columnHeaderArray = @prostateColumnArray if ($TISSUETYPE =~/prostate/i and $ORGANISM =~ /human/i);
    @columnHeaderArray = @prostateMouseColumnArray if ($TISSUETYPE =~/prostate/i and $ORGANISM =~ /mouse/i);
    @columnHeaderArray = @bladderMouseColumnArray if ($TISSUETYPE =~/bladder/i and $ORGANISM =~ /mouse/i);
      
    
    
		foreach my $entry (@columnHeaderArray)
		{
#print "$columnHeaderArray[$count]    $entry\n";
				$columnHeaderHash{$count} = $entry;
				$permenantHash{$count} if $entry =~ /(stain)|(cd)/i;
				$dataHash{$count}  if $entry !~ /(stain)|(cd)/i;
				$count++;
		}
#getting some lookUp values		
		%tissueType = $sbeams->selectTwoColumnHash (qq /Select tissue_type_name, tissue_type_id from $TBIS_TISSUE_TYPE/);
		%surgProc = $sbeams->selectTwoColumnHash	(qq /Select surgical_procedure_tag, surgical_procedure_id from $TBIS_SURGICAL_PROCEDURE/);
		%clinDiag = $sbeams->selectTwoColumnHash (qq /Select clinical_diagnosis_tag, clinical_diagnosis_id from $TBIS_CLINICAL_DIAGNOSIS/);
		%cellType = $sbeams->selectTwoColumnHash (qq / Select structural_unit_name, structural_unit_id from $TBIS_STRUCTURAL_UNIT/);
		%cellPresenceLevel = $sbeams->selectTwoColumnHash (qq / Select level_name,expression_level_id from $TBIS_EXPRESSION_LEVEL/);
		%antiBody = $sbeams->selectTwoColumnHash (qq / Select antibody_name, antibody_id from $TBIS_ANTIBODY/);
		%abundanceLevel = $sbeams->selectTwoColumnHash (qq /Select abundance_level_name, abundance_level_id from $TBIS_ABUNDANCE_LEVEL/);	
		
		%ontologyHash = $sbeams->selectTwoColumnHash(qq /SELECT CT.term_name,CT.ontology_term_id FROM $TBON_ONTOLOGY_TERM PT
		INNER JOIN $TBON_ONTOLOGY O ON ( PT.ontology_id = O.ontology_id )
		INNER JOIN $TBON_ONTOLOGY_TERM_RELATIONSHIP R ON ( PT.ontology_term_id = R.subject_term_id )
		INNER JOIN $TBON_ONTOLOGY_TERM CT ON ( R.object_term_id = CT.ontology_term_id)
		WHERE O.ontology_tag =\'SBEAMSOntology\' /);
		
			
		
		
		
	$TISSUETYPE = ucfirst($TISSUETYPE);
  $ORGANISM = ucfirst($ORGANISM);
	processFile();
#	loadImages() if %loadImageHash;	
	
}

#processig the file row by row
sub processFile
{

		my $sourceFile = $OPTIONS{"source_file"} || '';
		my $check_status = $OPTIONS{"check_status"} || '';
	 	my $errorFile =$OPTIONS{"error_file"} || '';
		unless ($QUIET)
		{
			$sbeams->printUserContext();
			print "\n";
		}

  #### Verify that source_file was passed and exists
   	unless ($TISSUETYPE) 
	{
		print "ERROR: You must supply a --tissue_type parameter\n$USAGE\n";
		exit;
	}
   unless ($ORGANISM)
   {
     print " ERROR: You must supply --organism parameter\n$USAGE\n";
   }
  	unless ($sourceFile) 
	{
		print "ERROR: You must supply a --source_file parameter\n$USAGE\n";
		exit;
	}
	unless (-e $sourceFile)
	{
	  print "ERROR: Supplied source_file '$sourceFile' not found\n";
	  exit;
	}
	unless ( $errorFile)
   {
	  print "ERROR: You must supply a  --error_file parameter\n$USAGE\n";
	  exit;
   }
	
	open (CONF, "Immuno".$TISSUETYPE.$ORGANISM."Conf.conf") or die "can not find ./ImmunoConf.conf file:\n$!";
	while (my $line = <CONF>) 
	{ 	
			next if $line =~ /^#/;
			$line =~ s/[\n\r]//g;
			next if $line =~ /^\s*$/;
			my ($key,$value) = split /==/, $line;
			$confHash{$key} = $value;
	}
	close CONF;
	
	$fhError = new FileHandle (">$errorFile") or die " $errorFile  can not open $!";

 	open (FH,"$sourceFile") or die "$sourceFile  $!";
	my $lineCount = 0;
	my $blockID = 0;
	my $slideID = 0;
	my $specimenID = 0;
	my $selectFlag = 1;
	my $channelID = 0;
	my ($gleason3,$gleason4,$gleason5,$specimenName,$sectionIndex,$stainName,$lastName, $abundanceLevelLeuk,$comment,$cancer, $specimenBlockSide);
	while (my $line = <FH>) 
	{
      
			next if $line =~ /^\s*$/;
#do this for the very first line,
#check the correct columnOrder	
			unless ($lineCount)
			{
				$line =~ s/\n//g;
				my @columnOrderArray = split /\t/, $line;
				foreach my $columnIndex (keys %columnHeaderHash)
				{
						$columnHeaderHash{$columnIndex} =~ s/[\t\s]+$//;
						$columnHeaderHash{$columnIndex} =~s/^[\t\s]+//;
						$columnOrderArray[$columnIndex] =~ s/\"//g;
				
						next if ($columnHeaderHash{$columnIndex} eq $columnOrderArray[$columnIndex]);
						print "incorrect ColumnOrder: $columnIndex:   required: $columnHeaderHash{$columnIndex} =====  input: $columnOrderArray[$columnIndex] \n";
						die ;
				}
				
				$lineCount++;	
				next;
			}
			$lineCount++;
			print "line: $lineCount\n";
		
#this happens to the 2nd and subsequent rows
  		$line =~ s/[\n\r]//g;
			my $blockUpdate = 0; 
			my $blockInsert = 1;
			my @dataArray = split	/\t/, $line ;
			my $exception = 'stain intensity';
	#		next row if there is no data in the row
	 		next if((grep /[\w\W\d]+/,@dataArray) == 3);
		  		
#put everything in a hash for easier handling
			my %infoHash;
			foreach my $keys (keys %columnHeaderHash)
			{
						
					next if ($dataArray[$keys]) eq '';
					$dataArray[$keys] =~ s/^[\s\t]+//g;
					$dataArray[$keys] =~ s/[\s\t]+$//g;
					if ($columnHeaderHash{$keys} =~ /\%.*staining/i)
					{
							$infoHash{$prostateCellHash{$columnHeaderHash{$keys}}} = $dataArray[$keys] ;
							next;						
					}
					$infoHash{$columnHeaderHash{$keys}} = $dataArray[$keys];
					
			}
			
#			$infoHash{'antibody'} = "CD".$infoHash{'antibody'} unless ($infoHash{'antibody'}=~/^cd/i);
#now fill serveral %rowdata to insert or update
#first create a rowdata for the specimenblock group
#this is the first line of a 3 line record
		if ($infoHash{'specimen block'})
		{
      print "block: $infoHash{'specimen block'}\n";
			if (!$antiBody{$infoHash{'antibody'}})
				{					
          
						Error (\@dataArray,"$infoHash{antibody} is not in the database");
						
				}	 
#this data is the same for all 3 rows and changes only for a new antibody 
				($specimenName) = $infoHash{'specimen block'} =~ /^(.*\d)/;
				print "name: $specimenName\n";
       
				my $blockQuery = qq/Select specimen_block_id from $TBIS_SPECIMEN_BLOCK where specimen_block_name = \'$infoHash{'specimen block'}\'/;
				my @block  = $sbeams->selectOneColumn($blockQuery);
				my $nrows = scalar(@block);
				$blockID = $block[0] if $nrows == 1;
				$blockID = 0 if $nrows == 0;
				if($blockID)
				{
						$blockUpdate = 1;
						$blockInsert = 0;
				}
				$stainName = $infoHash{'antibody'} .' '. $infoHash{'specimen block'};
			#	$stainName  = $stainName . " 1" unless( $TISSUETYPE =~ /bladder/i);
			#	print "Stain: $stainName\n";
				if ($TISSUETYPE =~/prostate/i)
				{
				print "section: $infoHash{'block antibody section index'}";
        
       
					if ($infoHash{'block antibody section index'})
					{;
						$sectionIndex = $infoHash{'block antibody section index'}; 
						$stainName  = $stainName . " ".$sectionIndex;
					}
					else 
					{
						$sectionIndex = 1;
						$stainName  = $stainName . " ".$sectionIndex;
					}
				}
				if ($TISSUETYPE =~ /prostate/i and $ORGANISM =~/mouse/i)
        {
          if ($infoHash{'lobe of prostate (central, lobe, other/unknown'} !~ /N\/A/i and defined ($infoHash{'lobe of prostate (central, lobe, other/unknown'}))
          { 
            $specimenBlockSide =  $infoHash{'lobe of prostate (central, lobe, other/unknown'};
          }
        }
        if ($TISSUETYPE =~/bladder/i)
				{
					print "$infoHash{'section'}\n";
					if ($infoHash{'section'})
					{
						$stainName = $stainName. " ".$infoHash{'section'};
						print "Stain: $stainName\n";
					}
				}
			
				$lastName = $infoHash{person};
				$abundanceLevelLeuk = $infoHash{'Leukocyte abundance (none, rare, moderate, high, most)'};
				$comment = $infoHash{'comment'};
#indicating that this is the first row of a data block
				$selectFlag = 1;
		}
#make sure that the other specimen column are empty
		else 
		{      
				$selectFlag = 0;
		}
#need to do the Select query and update query for the specimen block only once				
		if($selectFlag)
		{
      
#update specimen table
				my $specimenUpdate = 1; 
				my $specimenInsert = 0;
				my $specQuery = qq /select s.specimen_id,
				s.tissue_type_id,		
				s.organism_id,
				s.project_id,
				s.specimen_name
				from $TBIS_SPECIMEN s				
			 	where s.specimen_name = \'$specimenName\'/;

				my @specRow = $sbeams->selectSeveralColumns($specQuery);	
				my $nrows = scalar(@specRow);
				if ($nrows > 1)
				{		
						Error (\@dataArray, "$specimenID returned $nrows rows\n");
						next;
				}
				$specimenID = $specRow[0]->[0] if $nrows == 1;
				$specimenID = 0 if $nrows == 0;
				if (! $specimenID)
				{
						$specimenUpdate = 0;
						$specimenInsert = 1;
				}
				my %specRowData; 
				$specRowData{tissue_type_id} = $tissueType{$confHash{tissue_type_name}};
				$specRowData{individual_sex_term_id} = $ontologyHash{$infoHash{gender}};
				$specRowData{organism_id} = $confHash{organism_id}; 
				$specRowData{project_id} = $confHash{project_id};				
				$specRowData{specimen_name} = $specimenName;
				my $specimenReturnedPK = updateInsert(\%specRowData,$specRow[0]->[0],"specimen_id",$specimenInsert,$specimenUpdate,$TBIS_SPECIMEN);

#update the specimen_block table
				my @block = $sbeams->selectSeveralColumns(qq /select protocol_id	from $TBIS_SPECIMEN_BLOCK sb 
				where sb.specimen_block_id = $blockID/ );	
						
				my %blockRowData; 
				$blockRowData{protocol_id} = $confHash{protocol_id};
				$blockRowData{specimen_id} = $specimenReturnedPK;
				$blockRowData{specimen_block_name} = $infoHash{'specimen block'};
        $blockRowData{specimen_block_side} = $specimenBlockSide if defined ($specimenBlockSide); 																	
				my $blockReturnedPK =  updateInsert(\%blockRowData,$blockID,"specimen_block_id",
				$blockInsert,$blockUpdate,$TBIS_SPECIMEN_BLOCK);
#this way we can all see it			
				$blockID = $blockReturnedPK;
#now process the slides per blockID/tissue_section/antibody
#ASSAY
		my $slideInsert= 0; 
		my $slideUpdate = 1;
		my $slideQuery =  qq / select st.assay_id,
		st.project_id,st.protocol_id,st.assay_name,st.comment from
		$TBIS_ASSAY st
		join $TBIS_SPECIMEN_BLOCK  sb on sb.specimen_block_id = st.specimen_block_id 
		where sb.specimen_block_id = $blockID and st.assay_name = \'$stainName\';/;
		
		my @slides  = $sbeams->selectSeveralColumns($slideQuery);  
		$nrows = scalar(@slides);
		if ($nrows > 1)
		{	
				Error (\@dataArray, "$blockID returned $nrows rows\n");
				next;
				
		}
				
	 $slideID = $slides[0]->[0] if $nrows == 1;
	 $slideID = 0 if $nrows == 0;
	 if (! $slideID)
	 {
			$slideUpdate = 0;
			$slideInsert = 1;
	 }
	 	
#update, insert a assay

		my %slideRowData; 
		$slideRowData{project_id} = $confHash{project_id};
		$slideRowData{protocol_id} = $confHash{protocol_id};
		$slideRowData{specimen_block_id} = $blockID;
		$slideRowData{assay_name} = $stainName;
		$slideRowData{comment} = $infoHash{comment};
		my $returnedSlidePK = updateInsert(\%slideRowData,$slideID, "assay_id",$slideInsert,$slideUpdate,$TBIS_ASSAY); 
		$slideID = $returnedSlidePK;

#ASSAYCHANNEL	
		my $channelInsert = 0;
		my $channelUpdate = 1;	
		my $channelQuery =  qq / select ch.assay_channel_id,
		ch.channel_index, ch.antibody_id,ch.assay_channel_name,ch.comment ,detection_method_id from
		$TBIS_ASSAY_CHANNEL ch
		join $TBIS_ANTIBODY ab on ch.antibody_id = ab.antibody_id 
		where ab.antibody_name = \'$infoHash{antibody}\' and ch.assay_id = $slideID/; 
	
		my @channels  = $sbeams->selectSeveralColumns($channelQuery);  
		$nrows = scalar(@channels);
		if ($nrows > 1)
		{	
				Error (\@dataArray, "$slideID returned $nrows rows for Assay_channel\n");
				next;
				
		}
				
		$channelID = $channels[0]->[0] if $nrows == 1;
		$channelID = 0 if $nrows == 0;
		
	
		
		if (! $channelID)
		{
			$channelUpdate = 0;
			$channelInsert = 1;
		}
	
		my $assay_channel_name = $stainName." - chan 1";
		print "$assay_channel_name\n";
    
    next if (! $antiBody{$infoHash{antibody}});
		
			my %channelRowData;
			$channelRowData{assay_id}  = $slideID;
			$channelRowData{antibody_id} = $antiBody{$infoHash{antibody}};
			$channelRowData{channel_index} = 1; 
			$channelRowData{assay_channel_name} = $assay_channel_name;
		
			my $returnedChannel = updateInsert(\%channelRowData,$channelID, "assay_channel_id",$channelInsert,$channelUpdate,$TBIS_ASSAY_CHANNEL); 
			$channelID = $returnedChannel;
     
#now that we have the stained_slide_id we can handle the images
#images are in a comma seperated list of $infoHash{'file images'}
		if ($infoHash{'file images'})
		{
			my @images = split /,\s?/ ,$infoHash{'file images'};
			print "$infoHash{'file images'}\n";
			
			foreach my $image (@images)
			{ 
				$image =~ s/\"//;
				if ($image =~ /^(.*\s)(.*)(\.)(.*)$/)
				{
						my $imageName = $1.$2;
						my $fileName = $imageName.$3.'jpg';
						my $fileType = $4; 
						my $magnification = $2;
						my $imageUpdate = 0;
						my $imageInsert = 1;
						my $slideImageId = 0;
						print "$imageName---  $fileName\n";
						my $query = "Select assay_image_id from $TBIS_ASSAY_IMAGE where ";
						my $line = buildSql($query,$fileType).$fileName.'\'';
						my @slideImages = $sbeams->selectOneColumn($line);
						if(scalar(@slideImages))
						{								 
								$imageUpdate = 1;
								$imageInsert = 0;
								$slideImageId =  $slideImages[0];
						  if (scalar(@slideImages)>1)
							{
									my $nrows = scalar(@slideImages);
									Error (\@dataArray, "$fileName returned $nrows rows\n");
									die;
							}
						}
						my %imageRowData; 
						$imageRowData {raw_image_file} = $fileName if $fileType eq 'raw';
						$imageRowData {processed_image_file} = $fileName if $fileType eq 'pro';
						$imageRowData {annotated_image_file} = $fileName if $fileType eq 'ann';
						$imageRowData {assay_id} = $slideID;
						$imageRowData {image_magnification} = $magnification;
						$imageRowData {image_name} =  $imageName;
						$imageRowData {protocol_id} = $confHash{protocol_id};
						$imageRowData {apply_action} = 'INSERT';
#						my $returnedImagePK = updateInsert(\%imageRowData,$slideImageId, "slide_image_id",$imageInsert,$imageUpdate,$TBIS_SLIDE_IMAGE); 
#for the very last step to copy all file images to the new dir
#						loadImage(\%$imageRowData);  
#						'/net/dblocal/data/sbeams/IS_slide_image/'.$returnedImagePK.'_'.$imageNameingHash{$fileType}.'_image_file.dat';
						next;
				}
				die "Can not parse Image name:  $image\n";
			}
		}
	} #end of selectFlag
#ASSAYUNITEXPRESSION		
#loop through all the intensity levels and cell types update if needed or do an insert				
#need to map the cell types from the database to the celltypes (column header) in the spreadsheet
		foreach my $cellLine (keys %cellType)
		{
				print  "cellLine: $cellLine\n";
				print "staining level: $cellPresenceLevel{$infoHash{'stain intensity'}}\n";
			
				next if !exists($infoHash{$cellLine});
			  next if $infoHash{$cellLine} =~ /n\/?a/i;
				if ($cellLine eq 'Stromal Leukocytes') 
				{
					$infoHash{$cellLine} = $abundanceLevelLeuk;
				}
				my $cellQuery;				
				my $cellUpdate = 1;
				my $cellInsert = 0;
				
				
				if ($cellLine eq 'Stromal Leukocytes') 
				{
					 $cellQuery = qq /select cp.assay_unit_expression_id,  cp.assay_channel_id,cp.structural_unit_id,
					 cp.structural_unit_percent,cp.expression_level_id,abundance_level_id, cp.at_level_percent
					 from $TBIS_ASSAY_UNIT_EXPRESSION cp
					 inner join $TBIS_STRUCTURAL_UNIT ct on cp.structural_unit_id = ct.structural_unit_id
					 where ct.structural_unit_name = \'$cellLine\' and assay_channel_id = $channelID/;
				}
				else
				{	
							
					$cellQuery = qq /select cp.assay_unit_expression_id, cp.assay_channel_id, cp.structural_unit_id,
					cp.structural_unit_percent, cp.expression_level_id,abundance_level_id, cp.at_level_percent
					from $TBIS_ASSAY_UNIT_EXPRESSION cp
					inner join $TBIS_EXPRESSION_LEVEL cpl on cp.expression_level_id = cpl.expression_level_id
					inner join $TBIS_STRUCTURAL_UNIT ct on cp.structural_unit_id = ct.structural_unit_id
					where cpl.level_name = \'$infoHash{'stain intensity'}\' and ct.structural_unit_name = \'$cellLine\' and assay_channel_id  = $channelID/;
				}

				my @cellPresence = $sbeams->selectSeveralColumns($cellQuery); 
				if(scalar(@cellPresence) == 0)
				{
							$cellUpdate = $cellInsert;
							$cellInsert = 1;
				}
				elsif (scalar(@cellPresence)> 1)
				{
						Error(\@dataArray, "returned more than one row for this cellline: $cellLine\n");
				}
				my %cellLineRowData;

				$cellLineRowData{assay_channel_id} = $channelID;
				$cellLineRowData{structural_unit_id} = $cellType{$cellLine};# if($cellInsert);
				$cellLineRowData{expression_level_id} = $cellPresenceLevel{$infoHash{'stain intensity'}} if($cellLine ne 'Stromal Leukocytes');
				$cellLineRowData{at_level_percent} = $infoHash{$cellLine} unless ($cellLine eq 'Stromal Leukocytes');
				$cellLineRowData{abundance_level_id} = $abundanceLevel{$infoHash{$cellLine}} if $cellLine eq 'Stromal Leukocytes';
				$cellLineRowData{comment} = $comment if ($comment); 
				$cellLineRowData{expression_pattern_term_id} = $ontologyHash{$infoHash{expression_pattern}}  if ( defined($ontologyHash{$infoHash{expression_pattern}}));
				$cellLineRowData{percent_type_term_id} = $ontologyHash{$infoHash{percent_type}} if(defined($ontologyHash{$infoHash{percent_type}})); 
#$abundanceLevel{$abundanceLevelLeuk} if $cellLine eq 'Stromal Leukocytes' and $abundanceLevel{$abundanceLe;
#figureing out which Gleason cell line we have and what to update or insert
			if ($cellLine =~ /^Gleason/i)
			{ 
			
					my ($num) = $cellLine =~ /\d$/;
					my $gleason = $gleason5;
					$gleason = $gleason3 unless $num == 4 or $num == 5;
					$gleason = $gleason4 unless $num == 5;
					$cellLineRowData{structural_unit_percent} = $gleason;
			}	
			print "here we are\n";
			my $returnedStainCellPresencePK = updateInsert(\%cellLineRowData,$cellPresence[0]->[0], "assay_unit_expression_id",$cellInsert,$cellUpdate,$TBIS_ASSAY_UNIT_EXPRESSION); 
		}
	} #while loop
} #sub routine processFile()

# building the Sql clause for the images since it can be mess
sub buildSql 
{
		my $query = shift;
		my $kind = shift;
		my $clause;
		$clause = 'raw_image_file = \'' if $kind =~/raw/i;
		$clause = 'processed_image_file = \'' if $kind =~/pro/i;
		$clause = 'annotated_image_file = \'' if $kind =~/ann/i;
		return ($query.$clause);
}

# updateing or inserting the data into tables
sub updateInsert 
{
		my ($hashRef, $pK, $pkName,$insert,$update,$table) = @_;
		
#		print " $insert  ==  $update  == $pK  == $pkName  ==  $table\n";
#    foreach  my $key (keys %{$hashRef})
#    {
#      print "$key == $hashRef->{$key}\n";
#   }
	my $PK = $sbeams->updateOrInsertRow(
						insert => $insert,
						update => $update,
						table_name => $table,
						rowdata_ref => $hashRef,
						PK => $pkName,
						PK_value => $pK,
						return_PK => 1,
						verbose=> $VERBOSE,
						testonly=>$TESTONLY,
						add_audit_parameters => 1
						);
	
			return $PK; 
}

# finally load all the images 
sub loadImage
{ 
		my $imageHashRef = shift;
		my $server = "http://db.systemsbiology.net/sbeams";
		my $serverCommand = "Immunostain/ManageTable.cgi";

#### Fetch the desired data from the SBEAMS server
		my $resultset = $sbeams->fetch_data(
    server_uri => $server,
    server_command => $serverCommand,
    command_parameters => $imageHashRef,
  );

#	foreach my $fileName (keys %loadImageHash)
#		{
		#	if (copy('/users/mkorb/Immunostain/inputData/uploadImages/'.$filename $imageLoadHash{$fileName}))
#			{
#				print "$fileName === 	$loadImageHash{$fileName}\n";
#				next;
#			}
#			Error ("","Could not copy $fileName");
#		}

		
}
		
#writng a data error to an error file		
sub Error 
{
		my($arrayRef,$error) = @_;
		print $fhError  join "\t", (@$arrayRef);
		print $fhError "\t,$error\n"; 

}
